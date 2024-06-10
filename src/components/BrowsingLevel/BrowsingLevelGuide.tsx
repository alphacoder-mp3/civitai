import { Badge, Card, Group, Modal, Stack, Text } from '@mantine/core';
import { useDialogContext } from '~/components/Dialog/DialogProvider';
import { useHiddenPreferencesContext } from '~/components/HiddenPreferences/HiddenPreferencesProvider';
import {
  browsingLevels,
  getBrowsingLevelDetails,
} from '~/shared/constants/browsingLevel.constants';

export default function BrowsingLevelGuide() {
  const dialog = useDialogContext();
  const { moderatedTags } = useHiddenPreferencesContext();

  return (
    <Modal {...dialog} title="Browsing Level Guide">
      <Stack>
        {browsingLevels.map((browsingLevel) => {
          const tags = moderatedTags.filter((x) => x.nsfwLevel === browsingLevel && !x.parentId);
          const { name, description } = getBrowsingLevelDetails(browsingLevel);
          return (
            <Card withBorder key={browsingLevel}>
              <Card.Section withBorder inheritPadding py="xs">
                <Text weight={500}>{name}</Text>
              </Card.Section>
              <Card.Section withBorder inheritPadding py="xs">
                <Stack>
                  <Text>{description}</Text>
                  {!!tags.length && (
                    <Group spacing="xs">
                      {tags.map((tag) => (
                        <Badge key={tag.id}>{tag.name}</Badge>
                      ))}
                    </Group>
                  )}
                </Stack>
              </Card.Section>
            </Card>
          );
        })}
      </Stack>
    </Modal>
  );
}
